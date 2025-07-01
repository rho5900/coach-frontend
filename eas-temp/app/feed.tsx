import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
}
 from 'firebase/firestore';
import { db } from '@/constants/firebaseConfig';

export default function CoachFeed() {
  const { user, role, loading } = useAuth();
const router = useRouter();

  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchFeed = async () => {
      const snapshot = await getDocs(collection(db, 'coachFeed'));
      const data = snapshot.docs
  .map(doc => ({ id: doc.id, ...(doc.data() as any) }))

  .sort((a, b) => {
    const aTime = a.timestamp?.toMillis?.() || 0;
    const bTime = b.timestamp?.toMillis?.() || 0;
    return bTime - aTime;
  });
setFeedPosts(data);
    };

    fetchFeed();
  }, []);

  const handleComment = async (postId: string) => {
    const comment = commentInputs[postId];
    if (!comment.trim()) return;

    const postRef = doc(db, 'coachFeed', postId);
    const post = feedPosts.find(p => p.id === postId);
    const newComment = {
  name: user?.email,
  comment,
  timestamp: new Date(), // ✅ safe inside array
};

    try {
      await updateDoc(postRef, {
        comments: [...(post.comments || []), newComment],
      });
      setFeedPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
        )
      );
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error(err);
      Alert.alert('Error posting comment');
    }
  };

  if (loading) return null;
  if (role !== 'coach') return <Redirect href="/athlete" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: 'black', padding: 20 }}>
      <Text style={styles.header}>🧠 Coach Feed</Text>

      {feedPosts.map(post => (
        <View key={post.id} style={styles.card}>
          <Text style={styles.coachName}>{post.coachName}</Text>
          <Text style={styles.simInfo}>
            {post.simulation.profile?.sport} | Context: {post.simulation.profile?.context}
          </Text>
          <Text style={styles.lastMessage}>
            "{post.simulation.chat_history?.slice(-1)?.[0]?.message}"
          </Text>
          {post.simulation.evaluation && (
            <Text style={styles.score}>
              Score: {post.simulation.evaluation.split('\n')[0].replace('Score:', '')}
            </Text>
          )}

          <View style={{ marginTop: 10 }}>
  {(post.comments || []).map((c: any, idx: number) => (
    <View key={idx} style={{ marginBottom: 4 }}>
      <Text style={styles.comment}>
        💬 <Text style={{ fontWeight: 'bold' }}>{c.name}:</Text> {c.comment}
      </Text>
    </View>
  ))}
</View>


          <TextInput
            placeholder="Add a comment..."
            placeholderTextColor="#ccc"
            style={styles.input}
            value={commentInputs[post.id] || ''}
            onChangeText={text =>
              setCommentInputs(prev => ({ ...prev, [post.id]: text }))
            }
          />
          <Button title="Post Comment" onPress={() => handleComment(post.id)} />
            <Button
  title="← Back to Dashboard"
  onPress={() => router.push('/coach')}
  color="#888"
/>

        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginBottom: 20,
    borderRadius: 10,
  },
  coachName: {
    color: '#a0c4ff',
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 16,
  },
  simInfo: {
    color: '#fff',
    marginBottom: 4,
  },
  lastMessage: {
    fontStyle: 'italic',
    color: '#ccc',
    marginBottom: 4,
  },
  score: {
    color: '#8ef4c9',
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
    color: 'white',
  },
  comment: {
    color: '#eee',
    marginTop: 4,
  },
});
